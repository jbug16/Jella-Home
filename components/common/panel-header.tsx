import type { ReactNode } from "react";

import {
  PanelToolbar,
  PanelToolbarActions,
  PanelToolbarLeading,
} from "@/components/common/panel-toolbar";

type PeriodPanelHeaderProps = {
  navigator: ReactNode;
  actions?: ReactNode;
};

/**
 * Standard top row for budget, meals, shopping, and calendar:
 * period navigator on the left, icon action(s) on the right — one row on all widths.
 */
export function PeriodPanelHeader({
  navigator,
  actions,
}: PeriodPanelHeaderProps) {
  return (
    <PanelToolbar>
      <PanelToolbarLeading>{navigator}</PanelToolbarLeading>
      {actions ? <PanelToolbarActions>{actions}</PanelToolbarActions> : null}
    </PanelToolbar>
  );
}

type SearchPanelHeaderProps = {
  search: ReactNode;
  actions?: ReactNode;
};

/** Search field left, icon action(s) right — same row on all widths. */
export function SearchPanelHeader({ search, actions }: SearchPanelHeaderProps) {
  return (
    <PanelToolbar>
      <PanelToolbarLeading>{search}</PanelToolbarLeading>
      {actions ? <PanelToolbarActions>{actions}</PanelToolbarActions> : null}
    </PanelToolbar>
  );
}
