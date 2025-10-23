import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Switch } from "@/components/ui/switch";

interface Order {
  id: string;
  order_name: string;
  customer_name: string;
  amount: number;
  received_date: string;
  delivery_date: string;
  status: string;
  paid: boolean;
  services?: { name: string };
}

interface Service {
  id: string;
  name: string;
  price: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    order_name: "",
    customer_name: "",
    service_id: "",
    amount: "",
    received_date: format(new Date(), "yyyy-MM-dd"),
    delivery_date: format(new Date(), "yyyy-MM-dd"),
    status: "não iniciado",
    paid: false,
  });

  useEffect(() => {
    checkUser();
    loadOrders();
    loadServices();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    }
  };

  const loadOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        *,
        services (name)
      `)
      .order("received_date", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar encomendas");
      console.error(error);
    } else {
      setOrders(data || []);
    }
    setLoading(false);
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("active", true);

    if (error) {
      toast.error("Erro ao carregar serviços");
    } else {
      setServices(data || []);
    }
  };

  const handleServiceChange = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    setFormData({
      ...formData,
      service_id: serviceId,
      amount: service ? service.price.toString() : formData.amount,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const orderData = {
      order_name: formData.order_name,
      customer_name: formData.customer_name,
      service_id: formData.service_id || null,
      amount: parseFloat(formData.amount),
      received_date: formData.received_date,
      delivery_date: formData.delivery_date,
      status: formData.status,
      paid: formData.paid,
      user_id: user.id,
    };

    if (editingOrder) {
      const { error } = await supabase
        .from("orders")
        .update(orderData)
        .eq("id", editingOrder.id);

      if (error) {
        toast.error("Erro ao atualizar encomenda");
      } else {
        toast.success("Encomenda atualizada com sucesso!");
        setDialogOpen(false);
        setEditingOrder(null);
        resetForm();
        loadOrders();
      }
    } else {
      const { error } = await supabase.from("orders").insert([orderData]);

      if (error) {
        toast.error("Erro ao criar encomenda");
      } else {
        toast.success("Encomenda criada com sucesso!");
        setDialogOpen(false);
        resetForm();
        loadOrders();
      }
    }
  };

  const handleEdit = (order: Order) => {
    setEditingOrder(order);
    setFormData({
      order_name: order.order_name,
      customer_name: order.customer_name,
      service_id: order.services ? "" : "",
      amount: order.amount.toString(),
      received_date: order.received_date,
      delivery_date: order.delivery_date,
      status: order.status,
      paid: order.paid,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta encomenda?")) return;

    const { error } = await supabase.from("orders").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir encomenda");
    } else {
      toast.success("Encomenda excluída com sucesso!");
      loadOrders();
    }
  };

  const resetForm = () => {
    setFormData({
      order_name: "",
      customer_name: "",
      service_id: "",
      amount: "",
      received_date: format(new Date(), "yyyy-MM-dd"),
      delivery_date: format(new Date(), "yyyy-MM-dd"),
      status: "não iniciado",
      paid: false,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "concluído":
        return "bg-green-500";
      case "em andamento":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
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
          <h1 className="text-3xl font-bold">Encomendas</h1>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditingOrder(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nova Encomenda
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingOrder ? "Editar Encomenda" : "Nova Encomenda"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="order_name">Nome da Encomenda</Label>
                    <Input
                      id="order_name"
                      value={formData.order_name}
                      onChange={(e) =>
                        setFormData({ ...formData, order_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Nome do Cliente</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) =>
                        setFormData({ ...formData, customer_name: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="service_id">Serviço</Label>
                    <Select
                      value={formData.service_id}
                      onValueChange={handleServiceChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um serviço" />
                      </SelectTrigger>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name} - R$ {service.price.toFixed(2)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData({ ...formData, amount: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="received_date">Data de Recebimento</Label>
                    <Input
                      id="received_date"
                      type="date"
                      value={formData.received_date}
                      onChange={(e) =>
                        setFormData({ ...formData, received_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delivery_date">Prazo de Entrega</Label>
                    <Input
                      id="delivery_date"
                      type="date"
                      value={formData.delivery_date}
                      onChange={(e) =>
                        setFormData({ ...formData, delivery_date: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="não iniciado">Não Iniciado</SelectItem>
                        <SelectItem value="em andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluído">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 flex items-center gap-2">
                    <Switch
                      id="paid"
                      checked={formData.paid}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, paid: checked })
                      }
                    />
                    <Label htmlFor="paid">Pago</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingOrder(null);
                      resetForm();
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingOrder ? "Atualizar" : "Criar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {orders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Nenhuma encomenda cadastrada ainda.
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              Criar primeira encomenda
            </Button>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Encomenda</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Recebimento</TableHead>
                  <TableHead>Entrega</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_name}</TableCell>
                    <TableCell>{order.customer_name}</TableCell>
                    <TableCell>{order.services?.name || "-"}</TableCell>
                    <TableCell>
                      {format(new Date(order.received_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {format(new Date(order.delivery_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={order.paid ? "default" : "secondary"}>
                        {order.paid ? "Pago" : "Pendente"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      R$ {order.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(order)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(order.id)}
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
