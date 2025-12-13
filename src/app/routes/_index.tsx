import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Homepage Assistant" },
    {
      name: "description",
      content: "Your personal homepage assistant dashboard",
    },
  ];
};

export default function Index() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to Homepage Assistant
        </h1>
        <p className="text-muted-foreground">
          Your personal dashboard for managing and organizing your digital life.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Dashboard
            </h3>
            <p className="text-sm text-muted-foreground">
              Overview of your activities and metrics.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Documents
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage your files and documents.
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex flex-col space-y-1.5">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">
              Profile
            </h3>
            <p className="text-sm text-muted-foreground">
              Manage your account settings.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
              1
            </div>
            <div>
              <h3 className="font-medium">Explore the Navigation</h3>
              <p className="text-sm text-muted-foreground">
                Use the sidebar to navigate between different sections of your
                dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
              2
            </div>
            <div>
              <h3 className="font-medium">Customize Your Experience</h3>
              <p className="text-sm text-muted-foreground">
                Visit the Settings page to personalize your dashboard.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm">
              3
            </div>
            <div>
              <h3 className="font-medium">Add Your Content</h3>
              <p className="text-sm text-muted-foreground">
                Start adding documents, notes, and other content to organize
                your digital life.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
