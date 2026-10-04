import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-3xl font-semibold text-foreground">Iestatījumi</h1>
      <Card>
        <CardHeader>
          <CardTitle>Privātums un lomu konfigurācija</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Display name</label>
            <Input defaultValue="Līga M." />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Līderu saraksta redzamība</label>
            <Input defaultValue="School only" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Galvenā valoda</label>
            <Input defaultValue="Latviešu" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
