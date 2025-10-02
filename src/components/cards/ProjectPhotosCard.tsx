import React from "react";
import SectionCard from "@/components/cards/SectionCard";
import { photoService, PhotoRow } from "@/services/photoService";

export default function ProjectPhotosCard({ projectId, title }: { projectId: string; title?: string }) {
  const [photos, setPhotos] = React.useState<PhotoRow[]>([]);
  const [url, setUrl] = React.useState("");
  const [caption, setCaption] = React.useState("");

  const reload = async () => setPhotos(await photoService.list(projectId));
  React.useEffect(() => { reload(); }, [projectId]);

  return (
    <SectionCard title={title ?? "Project Photos"}>
      <div className="space-y-2 mb-4">
        <input
          type="text"
          placeholder="Photo URL (https://...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          type="text"
          placeholder="Caption (optional)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          className="px-3 py-1 border rounded disabled:opacity-50"
          disabled={!url}
          onClick={async () => {
            await photoService.create({ project_id: projectId, url, caption });
            setUrl(""); setCaption("");
            reload();
          }}
        >
          Add Photo
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {photos.map((p) => (
          <figure key={p.id} className="space-y-1">
            <img src={p.url} alt={p.caption ?? ""} className="w-full h-24 object-cover rounded" />
            {p.caption && <figcaption className="text-xs">{p.caption}</figcaption>}
          </figure>
        ))}
      </div>
    </SectionCard>
  );
}