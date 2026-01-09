import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ResultsTableProps {
  headers: string[];
  data: (string | number | null)[][];
  matchedCount: number;
  unmatchedCount: number;
}

export const ResultsTable = ({ headers, data, matchedCount, unmatchedCount }: ResultsTableProps) => {
  const displayData = data.slice(0, 20);

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Preview Results</h3>
        <div className="flex gap-4 text-sm">
          <span className="text-accent">
            ✓ {matchedCount} matched
          </span>
          <span className="text-muted-foreground">
            ○ {unmatchedCount} unmatched
          </span>
        </div>
      </div>
      
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {headers.map((header, i) => (
                <TableHead
                  key={i}
                  className={`text-muted-foreground font-medium ${
                    i === headers.length - 1 ? 'bg-primary/10 text-primary' : ''
                  }`}
                >
                  {header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayData.map((row, rowIndex) => (
              <TableRow key={rowIndex} className="border-border">
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    className={`${
                      cellIndex === row.length - 1
                        ? cell
                          ? 'bg-accent/10 text-accent font-medium'
                          : 'bg-muted/30 text-muted-foreground'
                        : ''
                    }`}
                  >
                    {cell ?? '—'}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>

      {data.length > 20 && (
        <div className="p-3 border-t border-border text-center text-sm text-muted-foreground">
          Showing 20 of {data.length} rows
        </div>
      )}
    </div>
  );
};
