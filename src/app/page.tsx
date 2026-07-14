import Link from "next/link";
import { Activity, Shield, BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* 导航栏 */}
      <header className="flex items-center justify-between border-b px-6 py-3.5">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold">API Balance Tracker</span>
        </div>
        <Link href="/dashboard">
          <Button size="sm">进入仪表盘 <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button>
        </Link>
      </header>

      {/* 主 Banner */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div className="mx-auto max-w-xl space-y-6">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground">
            <Shield className="h-3 w-3" />
            AES-256 加密存储
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            API Balance Tracker
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            统一查询多个 AI 大模型 API 的账户余额和 Token 消耗用量。
            支持 DeepSeek、OpenAI、智谱等主流服务商，密钥加密存储，安全可靠。
          </p>

          <div className="flex justify-center gap-3">
            <Link href="/dashboard">
              <Button size="lg">
                开始使用 <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* 功能特性 */}
          <div className="grid gap-3 pt-8 sm:grid-cols-3">
            {[
              { icon: BarChart3, title: "余额查询", desc: "实时查看各厂商账户余额" },
              { icon: Activity, title: "用量趋势", desc: "近 7 天 Token 消耗趋势图" },
              { icon: Shield, title: "安全加密", desc: "API Key AES-256 加密存储" },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-lg border bg-card p-4 text-left"
              >
                <Icon className="mb-2 h-4 w-4 text-primary" />
                <p className="text-xs font-medium">{title}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 页脚 */}
      <footer className="border-t px-6 py-3 text-center text-[10px] text-muted-foreground">
        API Balance Tracker — MIT License
      </footer>
    </div>
  );
}
