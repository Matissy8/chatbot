"use client";

import Link from "next/link";
import { Dialog } from "@base-ui/react/dialog";
import { Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FREE_DAILY_QUESTION_LIMIT } from "@/lib/plans";
import { useAppSession } from "@/components/providers/app-provider";
import { translate } from "@/lib/i18n";

export function LimitReachedModal({
  open,
  onOpenChange,
  limit = FREE_DAILY_QUESTION_LIMIT,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  limit?: number;
}) {
  const { language } = useAppSession();
  const tr = (text: string) => translate(language, text);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[60] bg-black/50 transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-[60] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card p-6 text-center text-card-foreground shadow-2xl outline-none">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Zap className="h-6 w-6" aria-hidden="true" />
          </div>
          <Dialog.Title className="text-xl font-semibold tracking-tight">{tr("Šodienas limits sasniegts")}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm text-muted-foreground">
            {tr("Esi izmantojis visus")} <strong className="font-semibold text-foreground">{limit} {tr("bezmaksas jautājumus")}</strong> {tr("šodien. Limits atjaunosies rīt, vai arī izvēlies Maestro PRO un turpini bez ierobežojumiem.")}
          </Dialog.Description>
          <div className="mt-6 flex flex-col gap-2">
            <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }), "h-10 w-full justify-center")}>
              {tr("Skatīt Maestro PRO")}
            </Link>
            <Dialog.Close className={cn(buttonVariants({ variant: "ghost", size: "lg" }), "h-10 w-full justify-center text-muted-foreground")}>
              {tr("Saprasts")}
            </Dialog.Close>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
