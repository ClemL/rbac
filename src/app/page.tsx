import { Console } from "@/components/Console";
import { DirectoryProvider } from "@/lib/store";

export default function Home() {
  return (
    <DirectoryProvider>
      <Console />
    </DirectoryProvider>
  );
}
