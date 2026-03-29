import { createFileRoute } from "@tanstack/react-router";
import { MemosPage } from "@/components/memo/memos-page";

export const Route = createFileRoute("/")({ component: App });

function App() {
  return <MemosPage />;
}
