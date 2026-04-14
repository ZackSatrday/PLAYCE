import { AppLayoutBody } from "./app-layout-body";
import { PlayerProvider } from "@/context/player-context";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlayerProvider>
      <AppLayoutBody>{children}</AppLayoutBody>
    </PlayerProvider>
  );
}
