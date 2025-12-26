import type { MetaFunction } from "react-router";

export const meta: MetaFunction = () => {
  return [
    { title: "Homepage" },
    {
      name: "description",
      content: "",
    },
  ];
};

export default function Index() {
  return null;
}
