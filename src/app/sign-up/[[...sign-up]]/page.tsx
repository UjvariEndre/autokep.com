import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { Car } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="bg-mesh relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 inline-flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
      >
        <span className="flex size-8 items-center justify-center rounded-xl bg-brand shadow-soft">
          <Car className="size-4 text-white" />
        </span>
        Autókép<span className="text-brand">.</span>
      </Link>
      <SignUp />
    </div>
  );
}
