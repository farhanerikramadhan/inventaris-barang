const config = {
  super_admin: { label: "Super Admin", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  admin: { label: "Admin", cls: "bg-green-100 text-green-700 border-green-200" },
  viewer: { label: "Viewer", cls: "bg-gray-100 text-gray-700 border-gray-200" },
};

export default function RoleBadge({ role, size = "sm" }) {
  const c = config[role] || config.viewer;
  const sizeCls = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-block rounded-full border font-medium ${c.cls} ${sizeCls}`}>
      {c.label}
    </span>
  );
}
