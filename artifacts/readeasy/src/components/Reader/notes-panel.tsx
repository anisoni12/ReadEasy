import { useState } from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerBody,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotes, type Note, type NoteColor } from '@/hooks/use-notes';
import { Highlighter, Trash2, Plus, BookmarkPlus, X } from 'lucide-react';

interface NotesPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  bookId: string;
  currentPage: number;
  onJumpToPage: (page: number) => void;
}

const COLORS: { value: NoteColor; label: string; swatchClass: string; cardClass: string }[] = [
  { value: 'amber', label: 'Amber', swatchClass: 'bg-amber-300', cardClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900' },
  { value: 'green', label: 'Green', swatchClass: 'bg-emerald-300', cardClass: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900' },
  { value: 'blue', label: 'Blue', swatchClass: 'bg-sky-300', cardClass: 'bg-sky-50 border-sky-200 dark:bg-sky-950/30 dark:border-sky-900' },
  { value: 'pink', label: 'Pink', swatchClass: 'bg-pink-300', cardClass: 'bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-900' },
  { value: 'plain', label: 'Plain', swatchClass: 'bg-muted-foreground/40', cardClass: 'bg-card border-border' },
];

function colorClass(color: NoteColor) {
  return COLORS.find((c) => c.value === color)?.cardClass ?? COLORS[0].cardClass;
}

export function NotesPanel({ isOpen, onOpenChange, bookId, currentPage, onJumpToPage }: NotesPanelProps) {
  const { notes, addNote, deleteNote } = useNotes(bookId);

  const [isComposing, setIsComposing] = useState(false);
  const [draftHighlight, setDraftHighlight] = useState('');
  const [draftText, setDraftText] = useState('');
  const [draftColor, setDraftColor] = useState<NoteColor>('amber');

  const resetDraft = () => {
    setDraftHighlight('');
    setDraftText('');
    setDraftColor('amber');
    setIsComposing(false);
  };

  const handleSave = () => {
    const highlight = draftHighlight.trim();
    const text = draftText.trim();
    if (!highlight && !text) return;
    addNote({
      page: currentPage,
      highlight: highlight || undefined,
      text,
      color: draftColor,
    });
    resetDraft();
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b border-border/40">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                <Highlighter size={20} className="stroke-[1.75]" />
              </div>
              <div>
                <DrawerTitle className="font-serif text-lg">Highlights & Notes</DrawerTitle>
                <DrawerDescription className="text-xs">
                  {notes.length === 0 ? 'Capture passages worth remembering' : `${notes.length} saved`}
                </DrawerDescription>
              </div>
            </div>
            {!isComposing && (
              <Button
                size="sm"
                onClick={() => setIsComposing(true)}
                className="rounded-full gap-1.5"
              >
                <Plus size={16} />
                New
              </Button>
            )}
          </div>
        </DrawerHeader>

        <DrawerBody className="px-6 py-4 flex-1 overflow-hidden flex flex-col">
          {isComposing && (
            <div className="border border-border rounded-xl p-4 mb-4 bg-card flex flex-col gap-3 flex-shrink-0">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  New on page {currentPage}
                </p>
                <Button variant="ghost" size="icon" className="w-7 h-7 rounded-full" onClick={resetDraft}>
                  <X size={14} />
                </Button>
              </div>

              <Textarea
                value={draftHighlight}
                onChange={(e) => setDraftHighlight(e.target.value)}
                placeholder="Paste or type the passage to highlight (optional)"
                className="text-sm min-h-[64px] font-serif"
              />
              <Textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                placeholder="Your note or thought..."
                className="text-sm min-h-[64px]"
              />

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground mr-1">Color</span>
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setDraftColor(c.value)}
                    className={`w-6 h-6 rounded-full ${c.swatchClass} ring-offset-2 ring-offset-card transition ${
                      draftColor === c.value ? 'ring-2 ring-foreground/60' : 'hover:scale-110'
                    }`}
                  />
                ))}
              </div>

              <div className="flex gap-2 mt-1">
                <Button size="sm" onClick={handleSave} className="flex-1 gap-1.5">
                  <BookmarkPlus size={14} /> Save
                </Button>
                <Button size="sm" variant="ghost" onClick={resetDraft}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 -mx-6 px-6">
            {notes.length === 0 && !isComposing ? (
              <EmptyState onCreate={() => setIsComposing(true)} />
            ) : (
              <div className="flex flex-col gap-3 pb-6">
                {notes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onDelete={() => deleteNote(note.id)}
                    onJump={() => {
                      onJumpToPage(note.page);
                      onOpenChange(false);
                    }}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function NoteCard({
  note,
  onDelete,
  onJump,
}: {
  note: Note;
  onDelete: () => void;
  onJump: () => void;
}) {
  const date = new Date(note.createdAt);
  return (
    <div className={`group rounded-xl border p-4 transition-shadow hover:shadow-sm ${colorClass(note.color)}`}>
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={onJump}
          className="text-xs font-semibold uppercase tracking-wide text-foreground/70 hover:text-foreground"
        >
          Page {note.page}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-foreground/50">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 text-foreground/60 hover:text-destructive"
            onClick={onDelete}
            aria-label="Delete note"
          >
            <Trash2 size={13} />
          </Button>
        </div>
      </div>

      {note.highlight && (
        <blockquote className="font-serif text-sm leading-snug text-foreground/90 border-l-2 border-foreground/30 pl-3 mb-2 italic">
          {note.highlight}
        </blockquote>
      )}
      {note.text && (
        <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{note.text}</p>
      )}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-10 gap-4">
      <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center">
        <Highlighter size={26} />
      </div>
      <div>
        <p className="font-serif font-medium text-foreground">No highlights yet</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-[220px]">
          Save passages and jot thoughts as you read.
        </p>
      </div>
      <Button onClick={onCreate} variant="outline" className="gap-1.5">
        <Plus size={14} /> Add your first note
      </Button>
    </div>
  );
}
