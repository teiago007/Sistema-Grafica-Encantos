import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Pencil, Trash2, UserPlus } from "lucide-react";

interface Profile {
  id: string;
  full_name: string;
  created_at: string;
  updated_at: string;
}

export default function Users() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    checkUser();
    loadProfiles();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar usuários");
      console.error(error);
    } else {
      setProfiles(data || []);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingProfile) {
      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: formData.full_name })
        .eq("id", editingProfile.id);

      if (error) {
        toast.error("Erro ao atualizar usuário");
      } else {
        toast.success("Usuário atualizado com sucesso!");
        setDialogOpen(false);
        setEditingProfile(null);
        resetForm();
        loadProfiles();
      }
    } else {
      // Create new user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) {
        toast.error("Erro ao criar usuário: " + authError.message);
      } else {
        toast.success("Usuário criado com sucesso!");
        setDialogOpen(false);
        resetForm();
        loadProfiles();
      }
    }
  };

  const handleEdit = (profile: Profile) => {
    setEditingProfile(profile);
    setFormData({
      email: "",
      password: "",
      full_name: profile.full_name,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    // Check if trying to delete own account
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id === id) {
      toast.error("Você não pode deletar sua própria conta");
      return;
    }

    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('delete-user', {
        body: { userId: id },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast.success("Usuário excluído com sucesso!");
      loadProfiles();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error("Erro ao excluir usuário: " + (error.message || "Erro desconhecido"));
    }
  };

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
    });
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-full">
          <p>Carregando...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingProfile(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProfile ? "Editar Usuário" : "Novo Usuário"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                {!editingProfile && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({ ...formData, password: e.target.value })
                        }
                        required
                        minLength={6}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingProfile(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProfile ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {profiles.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhum usuário cadastrado ainda.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data de Cadastro</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">{profile.full_name}</TableCell>
                    <TableCell>
                      {new Date(profile.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(profile)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(profile.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
