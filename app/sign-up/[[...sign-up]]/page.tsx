import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4" style={{ background: "#EDECEA" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#EFF6FF" }}>
              <span className="text-[12px] font-bold" style={{ color: "#2563EB" }}>CW</span>
            </div>
            <span className="text-[18px] font-semibold" style={{ color: "#1A1A18" }}>
              Campaign<span style={{ color: "#2563EB" }}>Wise</span>
            </span>
          </div>
          <p className="text-[13px]" style={{ color: "#9B9793" }}>Create your account</p>
        </div>
        <div className="flex justify-center">
          <SignUp appearance={{ elements: { rootBox: "w-full", card: "shadow-none" } }} />
        </div>
      </div>
    </main>
  );
}
