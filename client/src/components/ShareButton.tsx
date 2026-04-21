import { useState } from "react";
import { useToast } from "./Toast";

interface Props {
  shareToken: string;
}

export default function ShareButton({ shareToken }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/join/${shareToken}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="min-h-[44px] rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
    >
      {copied ? "Link copied!" : "Share list"}
    </button>
  );
}
