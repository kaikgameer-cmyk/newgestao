import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

interface ExpensesByCategoryChartProps {
  data: ExpenseCategory[];
}

const COLORS = [
  "hsl(48, 96%, 53%)",  // Primary yellow
  "hsl(142, 76%, 36%)", // Green
  "hsl(0, 84%, 60%)",   // Red
  "hsl(217, 91%, 60%)", // Blue
  "hsl(280, 65%, 60%)", // Purple
  "hsl(25, 95%, 53%)",  // Orange
  "hsl(180, 60%, 45%)", // Teal
  "hsl(0, 0%, 50%)",    // Gray
];

/**
 * Gráfico de pizza/donut responsivo para despesas por categoria
 * 
 * Layout adaptativo:
 * - Mobile: Gráfico menor + legenda abaixo
 * - Tablet: Gráfico médio + legenda ao lado
 * - Desktop: Gráfico maior + legenda ao lado
 */
export function ExpensesByCategoryChart({ data }: ExpensesByCategoryChartProps) {
  // Assign colors to data if not already set
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] sm:h-[250px] lg:h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhuma despesa registrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="text-lg">Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Container responsivo - empilha em mobile, lado a lado em tablet+ */}
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Gráfico - tamanho adaptativo */}
          <div className="w-full sm:w-1/2 h-[180px] sm:h-[200px] lg:h-[250px] min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="40%"
                  outerRadius="75%"
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                  labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toFixed(2)} (${((value / totalValue) * 100).toFixed(1)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legenda - responsiva */}
          <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3 overflow-auto max-h-[200px] sm:max-h-[250px]">
            {chartData.map((category, index) => {
              const percentage = ((category.value / totalValue) * 100).toFixed(1);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-muted-foreground truncate">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-muted-foreground">
                      {percentage}%
                    </span>
                    <span className="font-medium text-foreground">
                      R$ {category.value.toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
