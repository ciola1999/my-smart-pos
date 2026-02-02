'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Plus, Smartphone, Mail, User } from 'lucide-react';
import type { Member } from '@/db/schema';
import { deleteMemberAction } from '../actions';
import { toast } from 'sonner';
import { MemberDialog } from './member-dialog';

export function MemberTable({ data }: { data: Member[] }) {
  const tableRef = useRef<HTMLTableSectionElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useLayoutEffect(() => {
    if (!tableRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        'tr',
        { opacity: 0, x: -10 },
        { opacity: 1, x: 0, duration: 0.2, stagger: 0.03, ease: 'power1.out' }
      );
    }, tableRef);
    return () => ctx.revert();
  }, [data]);

  const handleEdit = (member: Member) => {
    setSelectedMember(member);
    setIsDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedMember(null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Yakin ingin menghapus member ini?')) return;
    const res = await deleteMemberAction(id);
    if (res.status === 'success') {
      toast.success(res.message);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <>
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Daftar Member
          </h2>
          <p className="text-sm text-gray-400">
            Total {data.length} pelanggan terdaftar
          </p>
        </div>

        <Button
          onClick={handleCreate}
          className="bg-lime-400 text-black hover:bg-lime-500 shadow-[0_0_20px_rgba(163,230,53,0.2)] font-bold tracking-tight transition-all active:scale-95"
        >
          <Plus className="mr-2 h-4 w-4 stroke-[3]" /> Tambah Member
        </Button>
      </div>

      <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl flex flex-col">
        <div className="overflow-x-auto w-full">
          {/* PERBAIKAN: Pastikan tidak ada spasi di antara Table dan TableHeader */}
          <Table className="min-w-[800px]">
            <TableHeader className="bg-white/5 border-b border-white/5">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-[35%] min-w-[250px] text-xs uppercase tracking-wider text-gray-400 font-bold py-4 pl-6">
                  Informasi Member
                </TableHead>
                <TableHead className="w-[25%] text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Kontak
                </TableHead>
                <TableHead className="w-[25%] text-xs uppercase tracking-wider text-gray-400 font-bold">
                  Status
                </TableHead>
                <TableHead className="w-[15%] text-right text-xs uppercase tracking-wider text-gray-400 font-bold pr-6">
                  Aksi
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody ref={tableRef}>
              {data.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-2">
                      <User className="w-8 h-8 opacity-20" />
                      <p>Belum ada data member.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.map((member) => (
                  <TableRow
                    key={member.id}
                    className="group border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300 border border-white/5">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-white text-sm">
                            {member.name}
                          </span>
                          {member.email && (
                            <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                              <Mail className="w-2.5 h-2.5" />
                              <span>{member.email}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-2 text-gray-300">
                        <Smartphone className="w-3.5 h-3.5 text-gray-500" />
                        <span className="font-mono text-sm tracking-wide">
                          {member.phone}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="py-3">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className={`
                            px-2 py-0 text-[10px] uppercase font-bold border-0 ring-1 ring-inset min-w-[60px] justify-center
                            ${
                              member.tier === 'Gold'
                                ? 'bg-yellow-500/10 text-yellow-500 ring-yellow-500/20'
                                : member.tier === 'Platinum'
                                  ? 'bg-purple-500/10 text-purple-400 ring-purple-500/20'
                                  : 'bg-gray-500/10 text-gray-400 ring-gray-500/20'
                            }
                          `}
                        >
                          {member.tier}
                        </Badge>
                        <span className="text-xs text-gray-500 font-mono">
                          {member.points} pts
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right py-3 pr-6">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(member)}
                          className="h-7 w-7 p-0 hover:text-blue-400 hover:bg-blue-400/10 text-gray-600"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(member.id)}
                          className="h-7 w-7 p-0 hover:text-red-400 hover:bg-red-400/10 text-gray-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <MemberDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        initialData={selectedMember}
      />
    </>
  );
}
