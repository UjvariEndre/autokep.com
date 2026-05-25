import { Languages, Palette } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getI18n } from "@/i18n/locale";
import { getOrCreateUser } from "@/server/users";
import { isTheme, type Theme } from "@/i18n/config";
import { LanguageSelect } from "./language-select";
import { ThemeSelect } from "./theme-select";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { dict } = await getI18n();
  const t = dict.settings;
  const user = await getOrCreateUser();
  const theme: Theme = isTheme(user.theme) ? user.theme : "light";

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="size-4 text-brand" />
            {t.languageLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.languageHelp}</p>
          <LanguageSelect />
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4 text-brand" />
            {t.themeLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t.themeHelp}</p>
          <ThemeSelect current={theme} />
        </CardContent>
      </Card>
    </div>
  );
}
