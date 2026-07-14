"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

interface ApiKeyFormProps {
  onSuccess?: () => void;
}

export function ApiKeyForm({ onSuccess }: ApiKeyFormProps) {
  const [label, setLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [platformCookie, setPlatformCookie] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!label.trim() || !apiKey.trim()) {
      toast.error("请填写 Key 名称和 API Key");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          label: label.trim(),
          apiKey: apiKey.trim(),
          platformCookie: platformCookie.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error ?? "保存失败");
        return;
      }

      toast.success("API Key 保存成功");
      setLabel("");
      setApiKey("");
      setPlatformCookie("");
      onSuccess?.();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">添加 API Key</CardTitle>
        <CardDescription className="text-xs">
          密钥将加密存储。Platform Cookie 可选，用于访问 platform.deepseek.com 通过 WAF 校验。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider">服务商</Label>
              <Select
                value={provider}
                onValueChange={(val) => { if (val) setProvider(val); }}
              >
              <SelectTrigger id="provider">
                <SelectValue placeholder="选择服务商" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="deepseek">DeepSeek</SelectItem>
                <SelectItem value="openai" disabled>
                  OpenAI（即将支持）
                </SelectItem>
                <SelectItem value="zhipu" disabled>
                  智谱（即将支持）
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label">Key 名称</Label>
            <Input
              id="label"
              placeholder="例如：我的 DeepSeek Key"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-xxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cookie">
              平台 Cookie <span className="text-[10px] text-muted-foreground">（可选）</span>
            </Label>
            <Input
              id="cookie"
              placeholder="从浏览器控制台复制 platform.deepseek.com 的 Cookie"
              value={platformCookie}
              onChange={(e) => setPlatformCookie(e.target.value)}
            />
            <p className="text-[10px] text-muted-foreground">
              浏览器打开 platform.deepseek.com → DevTools → Application → Cookies → 复制所有 cookie 值
            </p>
          </div>

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "保存中..." : "保存"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
