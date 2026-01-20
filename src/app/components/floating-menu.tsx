"use client";

import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { MenuIcon, Trash2Icon, UserIcon, MailIcon } from "lucide-react";
import { useState } from "react";

export type FloatingMenuProps = {
  onClearConversation?: () => void;
};

export function FloatingMenu({ onClearConversation }: FloatingMenuProps) {
  const [open, setOpen] = useState(false);

  const handleClearConversation = () => {
    onClearConversation?.();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="fixed top-4 left-4 z-50 rounded-full shadow-lg"
          aria-label="Open menu"
        >
          <MenuIcon className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav className="mt-6 flex flex-col gap-2">
          <Button
            variant="ghost"
            className="justify-start gap-3"
            onClick={handleClearConversation}
          >
            <Trash2Icon className="size-4" />
            Clear Conversation
          </Button>
          <Button variant="ghost" className="justify-start gap-3" asChild>
            <a href="#about">
              <UserIcon className="size-4" />
              About Me
            </a>
          </Button>
          <Button variant="ghost" className="justify-start gap-3" asChild>
            <a href="mailto:contact@archil.io">
              <MailIcon className="size-4" />
              Contact
            </a>
          </Button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
