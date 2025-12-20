import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpenseCategory {
  name: string;
  value: number;
  color: string;
}

interface ExpensesByCategoryChartProps {
  data: ExpenseCategory[];
  compact?: boolean;
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
export function ExpensesByCategoryChart({ data, compact = false }: ExpensesByCategoryChartProps) {
  // Assign colors to data if not already set
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || COLORS[index % COLORS.length],
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  if (chartData.length === 0) {
    return (
      <Card variant="elevated">
        <CardHeader className={compact ? "pb-2" : ""}>
          <CardTitle className={compact ? "text-base" : "text-lg"}>Despesas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`${compact ? "h-[120px]" : "h-[200px] sm:h-[250px] lg:h-[300px]"} flex items-center justify-center text-muted-foreground text-sm`}>
            Sem despesas neste dia
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="elevated">
      <CardHeader className={compact ? "pb-2" : ""}>
        <CardTitle className={compact ? "text-base" : "text-lg"}>Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent className={compact ? "p-3" : "p-3 sm:p-6"}>
        {/* Container responsivo - empilha em mobile, lado a lado em tablet+ */}
        <div className={`flex ${compact ? "flex-row" : "flex-col md:flex-row"} items-center gap-3 sm:gap-6`}>
          {/* Gráfico - tamanho adaptativo com aspect ratio fixo */}
          <div className={`${compact ? "w-32 h-32" : "w-full md:w-1/2 aspect-square max-h-[200px] sm:max-h-[220px] md:max-h-[250px]"} flex items-center justify-center`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius="35%"
                  outerRadius="70%"
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
                    fontSize: "12px",
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

          {/* Legenda - responsiva com grid em mobile */}
          <div className={`${compact ? "flex-1" : "w-full md:w-1/2"} grid grid-cols-1 ${compact ? "" : "xs:grid-cols-2 md:grid-cols-1"} gap-2 sm:gap-3 overflow-auto ${compact ? "max-h-[130px]" : "max-h-[180px] sm:max-h-[220px] md:max-h-[250px]"} px-1`}>
            {chartData.map((category, index) => {
              const percentage = ((category.value / totalValue) * 100).toFixed(1);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between gap-1.5 sm:gap-2 text-xs sm:text-sm py-1 px-2 rounded-md bg-muted/30"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                    <div
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-muted-foreground truncate text-xs sm:text-sm">
                      {category.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden xs:inline">
                      {percentage}%
                    </span>
                    <span className="font-medium text-foreground text-xs sm:text-sm whitespace-nowrap">
                      R$ {category.value.toFixed(0)}
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
