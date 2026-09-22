"use client";

/* Tiptap rich text: тод, налуу, H2/H3, жагсаалт, холбоос, зураг (upload → URL). HTML string-ээр солилцоно. */

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useEffect, useRef } from "react";

interface Props { value: string; onChange: (html: string) => void; onUploadImage: (file: File) => Promise<string> }

/* Тайлбар товч. Модулийн түвшинд зарлана — render-ийн дотор компонент зарлавал
   react-hooks/static-components дүрэм алдаа өгдөг (React 19 / eslint-config-next 16). */
function B({ on, active, children, title }: { on: () => void; active?: boolean; children: React.ReactNode; title: string }) {
  return (
    <button type="button" title={title} onClick={on} className={`rounded px-2 py-1 text-sm ${active ? "bg-navy text-white" : "hover:bg-slate-100"}`}>{children}</button>
  );
}

export function RichText({ value, onChange, onUploadImage }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true },
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Image,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: "news-body min-h-56 rounded-b-lg border border-t-0 border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none" } },
  });
  useEffect(() => { if (editor && value !== editor.getHTML()) editor.commands.setContent(value, { emitUpdate: false }); }, [value, editor]);
  if (!editor) return null;
  async function addImage() {
    const f = fileRef.current?.files?.[0]; if (!f) return;
    const url = await onUploadImage(f); editor?.chain().focus().setImage({ src: url, alt: f.name }).run();
    if (fileRef.current) fileRef.current.value = "";
  }
  function setLink() {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = prompt("Холбоос (URL)", prev ?? "https://");
    if (url === null) return;
    if (!url) editor?.chain().focus().unsetLink().run(); else editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }
  return (
    <div>
      <div className="flex flex-wrap gap-1 rounded-t-lg border border-slate-300 bg-slate-50 p-1">
        <B title="Тод" on={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}><b>B</b></B>
        <B title="Налуу" on={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}><i>I</i></B>
        <B title="Гарчиг 2" on={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</B>
        <B title="Гарчиг 3" on={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>H3</B>
        <B title="Жагсаалт" on={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>•</B>
        <B title="Дугаарласан" on={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>1.</B>
        <B title="Ишлэл" on={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")}>❝</B>
        <B title="Холбоос" on={setLink} active={editor.isActive("link")}>🔗</B>
        <label className="cursor-pointer rounded px-2 py-1 text-sm hover:bg-slate-100" title="Зураг оруулах">🖼<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addImage} /></label>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
