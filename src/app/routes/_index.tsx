import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import Welcome from "../features/welcome/welcome";

export async function loader() {
  return {
    streamingEndpoint: process.env.LLM_STREAM_URL,
  };
}

export const meta: MetaFunction = () => {
  return [
    { title: "Archil Lelashvili - Software Engineer" },
    {
      name: "description",
      content:
        "Personal homepage and AI assistant for Archil Lelashvili, a software engineer building dynamic web applications.",
    },
  ];
};

export default function Index() {
  const { streamingEndpoint } = useLoaderData<typeof loader>();
  return <Welcome streamingEndpoint={streamingEndpoint} />;
}
