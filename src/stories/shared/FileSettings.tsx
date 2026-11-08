import type { ReactNode } from "react";
import { FileCode } from "lucide-react";
import { Panel } from "../../components/Panel";
import { Callout } from "../../components/Callout";
import { StatusBadge } from "../../components/Badge";
import type { ProductId } from "../../tokens/products";
import { SettingsPage } from "./CommonPages";

export interface FileSetting {
  label: string;
  value: ReactNode;
  /** Where it is in the file, such as iys.brand_code. */
  path: string;
}

export interface FileSettingsGroup {
  title: string;
  description?: string;
  items: FileSetting[];
}

/**
 * Settings of a product that are kept in its own YAML file: shown read-only in their own tab of Settings, with the file as
 * it was applied, next to the shared tabs (members, sign-in, data, audit log) every product has.
 * They are changed in the file and reviewed like code; the product reads it again within a minute.
 */
export function FileSettingsPage({
  product,
  file,
  applied,
  groups,
  yaml,
}: {
  product: ProductId;
  file: string;
  applied: string;
  groups: FileSettingsGroup[];
  yaml: string;
}) {
  return <SettingsPage product={product} file={{ name: file, content: <FileSettings file={file} applied={applied} groups={groups} yaml={yaml} /> }} />;
}

function FileSettings({ file, applied, groups, yaml }: { file: string; applied: string; groups: FileSettingsGroup[]; yaml: string }) {
  return (
    <>
      <Callout tone="info" title={`Read-only: ${file} decides`} className="mb-2.5">
        <span className="flex flex-wrap items-center gap-2">
          Edit the file and commit it. The product reads it again within a minute and lists any line it could not apply.
          <StatusBadge tone="success">Applied {applied}</StatusBadge>
        </span>
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          {groups.map((g) => (
            <Panel key={g.title} title={g.title} description={g.description} aria-label={g.title}>
              <dl className="grid grid-cols-[minmax(120px,40%)_minmax(0,1fr)] gap-x-3 gap-y-2 text-xs">
                {g.items.map((i) => (
                  <div key={i.path} className="contents">
                    <dt className="flex flex-col text-fg-muted">
                      {i.label}
                      <code className="truncate font-mono text-2xs text-fg-muted">{i.path}</code>
                    </dt>
                    <dd className="min-w-0 text-fg">{i.value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
          ))}
        </div>
        <Panel title={file} description={`As applied ${applied}`} actions={<FileCode aria-hidden className="size-3.5 text-fg-muted" />} className="self-start">
          <pre aria-label={`${file} as applied`} className="overflow-x-auto rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs leading-relaxed text-fg">
            {yaml}
          </pre>
        </Panel>
      </div>
    </>
  );
}
