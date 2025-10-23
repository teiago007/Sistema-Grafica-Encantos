import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Order {
  id: string;
  amount: number;
  received_date: string;
  status: string;
  paid: boolean;
}

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUser();
    loadOrders();
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
      .select("*")
      .order("received_date", { ascending: true });

    if (error) {
      toast.error("Erro ao carregar dados");
      console.error(error);
    } else {
      setOrders(data || []);
      
      // Calculate totals based on paid orders
      const income = data
        ?.filter((order) => order.paid)
        .reduce((sum, order) => sum + parseFloat(order.amount.toString()), 0) || 0;
      
      // For now, expenses are orders that are not paid yet (could be adjusted)
      const expense = data
        ?.filter((order) => !order.paid)
        .reduce((sum, order) => sum + parseFloat(order.amount.toString()), 0) || 0;

      setTotalIncome(income);
      setTotalExpense(expense);
    }
    setLoading(false);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Relatório Financeiro - Gráfica e Encantos", 14, 20);
    
    doc.setFontSize(12);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 14, 30);
    
    doc.setFontSize(14);
    doc.text("Resumo Financeiro", 14, 45);
    
    doc.setFontSize(12);
    doc.text(`Total de Receitas (Pagas): R$ ${totalIncome.toFixed(2)}`, 14, 55);
    doc.text(`Total de Despesas (Pendentes): R$ ${totalExpense.toFixed(2)}`, 14, 65);
    doc.text(`Lucro Líquido: R$ ${(totalIncome - totalExpense).toFixed(2)}`, 14, 75);
    
    // Prepare data for table
    const tableData = orders.map(order => [
      new Date(order.received_date).toLocaleDateString(),
      order.status,
      order.paid ? "Pago" : "Pendente",
      `R$ ${parseFloat(order.amount.toString()).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: 85,
      head: [['Data', 'Status', 'Pagamento', 'Valor']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [219, 112, 147] },
    });
    
    doc.save(`relatorio-financeiro-${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success("Relatório exportado com sucesso!");
  };

  const chartData = orders.reduce((acc: any[], order) => {
    const month = new Date(order.received_date).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });

    const existing = acc.find((item) => item.month === month);
    
    if (existing) {
      if (order.paid) {
        existing.receitas += parseFloat(order.amount.toString());
      } else {
        existing.despesas += parseFloat(order.amount.toString());
      }
    } else {
      acc.push({
        month,
        receitas: order.paid ? parseFloat(order.amount.toString()) : 0,
        despesas: !order.paid ? parseFloat(order.amount.toString()) : 0,
      });
    }

    return acc;
  }, []);

  const profit = totalIncome - totalExpense;

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
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-2">Visão geral do seu negócio</p>
          </div>
          <Button onClick={exportToPDF} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório PDF
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-gradient-card shadow-lg border-success/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Receitas
              </CardTitle>
              <ArrowUpRight className="h-5 w-5 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                R$ {totalIncome.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Encomendas pagas
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-lg border-destructive/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Despesas
              </CardTitle>
              <ArrowDownRight className="h-5 w-5 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                R$ {totalExpense.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Encomendas pendentes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-primary shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-primary-foreground/80">
                Lucro Líquido
              </CardTitle>
              <TrendingUp className="h-5 w-5 text-primary-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary-foreground">
                R$ {profit.toFixed(2)}
              </div>
              <p className="text-xs text-primary-foreground/80 mt-1">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Legend />
                  <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Evolução do Lucro</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.map(d => ({ ...d, lucro: d.receitas - d.despesas }))}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-muted-foreground" />
                  <YAxis className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="lucro"
                    stroke="hsl(var(--accent))"
                    fill="hsl(var(--accent))"
                    fillOpacity={0.3}
                    name="Lucro"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
