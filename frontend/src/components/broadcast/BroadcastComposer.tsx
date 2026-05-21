"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  message: string;
  onMessageChange: (msg: string) => void;
  customerCount: number;
  isSending: boolean;
  onSend: () => void;
}

export default function BroadcastComposer({
  message,
  onMessageChange,
  customerCount,
  isSending,
  onSend,
}: Props) {
  const charCount = message.length;
  const isDisabled =
    message.trim() === "" ||
    charCount > 500 ||
    customerCount === 0 ||
    isSending;

  const charCountColor =
    charCount === 500
      ? "text-red-500 animate-pulse"
      : charCount > 480
        ? "text-red-500"
        : "text-text-muted";

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="text-navy text-base font-semibold">
          Compose Message
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Textarea */}
        <div>
          <Label
            htmlFor="broadcast-message"
            className="text-sm font-medium text-navy mb-2 block"
          >
            Message
          </Label>
          <Textarea
            id="broadcast-message"
            value={message}
            onChange={(e) => onMessageChange(e.target.value)}
            maxLength={500}
            placeholder="Type your broadcast message... Use {{name}} for customer name and {{store_name}} for your store name."
            style={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: "14px",
              minHeight: "120px",
            }}
            className="resize-none"
          />
          {/* Character counter */}
          <div className="flex justify-end mt-1">
            <span className={`text-xs font-mono ${charCountColor}`}>
              {charCount}/500
            </span>
          </div>
          {/* Variable hints */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs text-text-muted">Variables:</span>
            <span className="bg-gray-100 text-xs font-mono px-2 py-0.5 rounded">
              {"{{name}}"}
            </span>
            <span className="text-xs text-text-muted">Customer's first name</span>
            <span className="bg-gray-100 text-xs font-mono px-2 py-0.5 rounded ml-2">
              {"{{store_name}}"}
            </span>
            <span className="text-xs text-text-muted">Your store name</span>
          </div>
        </div>

        {/* Send button */}
        <Button
          className="w-full"
          style={
            isDisabled
              ? { backgroundColor: "#E2E8F0", color: "#94A3B8", cursor: "not-allowed" }
              : { backgroundColor: "#F97316", color: "#ffffff" }
          }
          onClick={onSend}
          disabled={isDisabled}
        >
          {isSending
            ? "Sending..."
            : `Send Broadcast to ${customerCount} customer${customerCount !== 1 ? "s" : ""}`}
        </Button>
      </CardContent>
    </Card>
  );
}
