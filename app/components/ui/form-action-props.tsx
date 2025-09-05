import { Button } from "@/components/ui/button";

type FormActionsProps = {
  loading?: boolean;
  onCancel?: () => void;
  onSave?: () => void;
  cancelText?: string;
  saveText?: string;
};

export function FormActions({
  loading = false,
  onCancel,
  onSave,
  cancelText = "Cancel",
  saveText = "Save Changes",
}: FormActionsProps) {
  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
      <Button className="dark:text-white" onClick={onSave} disabled={loading}>
        {loading ? "Saving..." : saveText}
      </Button>
    </div>
  );
}
