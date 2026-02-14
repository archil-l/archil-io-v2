import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import {
  Route53Client,
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
} from "@aws-sdk/client-route-53";

interface UpdateNsRecordsEvent {
  childHostedZoneId: string;
  parentHostedZoneId: string;
  delegationRoleArn: string;
  subdomain: string;
}

const MAX_RETRIES = 3;
const BASE_DELAY = 1000; // 1 second

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNameservers(
  route53Client: Route53Client,
  hostedZoneId: string,
): Promise<string[]> {
  const response = await route53Client.send(
    new ListResourceRecordSetsCommand({
      HostedZoneId: hostedZoneId,
    }),
  );

  const nsRecord = response.ResourceRecordSets?.find(
    (record) => record.Type === "NS",
  );

  if (!nsRecord || !nsRecord.ResourceRecords) {
    throw new Error(`No NS record found for zone ${hostedZoneId}`);
  }

  return nsRecord.ResourceRecords.map((record) => record.Value || "").filter(
    Boolean,
  );
}

async function updateNsRecords(
  route53Client: Route53Client,
  parentHostedZoneId: string,
  subdomain: string,
  nameservers: string[],
): Promise<void> {
  await route53Client.send(
    new ChangeResourceRecordSetsCommand({
      HostedZoneId: parentHostedZoneId,
      ChangeBatch: {
        Changes: [
          {
            Action: "UPSERT",
            ResourceRecordSet: {
              Name: subdomain,
              Type: "NS",
              TTL: 3600,
              ResourceRecords: nameservers.map((ns) => ({
                Value: ns,
              })),
            },
          },
        ],
      },
    }),
  );
}

export const handler = async (
  event: UpdateNsRecordsEvent,
): Promise<{ statusCode: number; body: string }> => {
  const {
    childHostedZoneId,
    parentHostedZoneId,
    delegationRoleArn,
    subdomain,
  } = event;

  console.log(
    `Updating NS records for ${subdomain} (parent zone: ${parentHostedZoneId})`,
  );

  try {
    // Create Route53 client for child zone (no special credentials needed)
    const route53Client = new Route53Client({ region: "us-east-1" });

    // Get nameservers from child zone
    const nameservers = await getNameservers(route53Client, childHostedZoneId);

    if (nameservers.length === 0) {
      throw new Error("No nameservers found in child zone");
    }

    console.log(`Found nameservers: ${nameservers.join(", ")}`);

    // Retry logic for assuming role and updating NS records
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Assume delegation role in parent account
        const sts = new STSClient({ region: "us-east-1" });
        const assumeRoleResponse = await sts.send(
          new AssumeRoleCommand({
            RoleArn: delegationRoleArn,
            RoleSessionName: `ns-update-${Date.now()}`,
            DurationSeconds: 900, // 15 minutes
          }),
        );

        const credentials = assumeRoleResponse.Credentials;
        if (!credentials) {
          throw new Error("Failed to obtain credentials from role assumption");
        }

        // Create Route53 client with assumed role credentials
        const route53WithRole = new Route53Client({
          region: "us-east-1",
          credentials: {
            accessKeyId: credentials.AccessKeyId || "",
            secretAccessKey: credentials.SecretAccessKey || "",
            sessionToken: credentials.SessionToken,
          },
        });

        // Update NS records in parent zone
        await updateNsRecords(
          route53WithRole,
          parentHostedZoneId,
          subdomain,
          nameservers,
        );

        console.log(
          `Successfully updated NS records for ${subdomain} on attempt ${attempt + 1}`,
        );
        return {
          statusCode: 200,
          body: JSON.stringify({
            message: `NS records updated successfully for ${subdomain}`,
            nameservers,
          }),
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.log(`Attempt ${attempt + 1} failed: ${lastError.message}`);

        if (attempt < MAX_RETRIES - 1) {
          const delay = BASE_DELAY * Math.pow(2, attempt);
          console.log(
            `Retrying after ${delay}ms (attempt ${attempt + 2}/${MAX_RETRIES})`,
          );
          await sleep(delay);
        }
      }
    }

    // All retries failed
    throw new Error(
      `Failed to update NS records after ${MAX_RETRIES} attempts: ${lastError?.message}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error updating NS records: ${errorMessage}`);
    throw error;
  }
};
