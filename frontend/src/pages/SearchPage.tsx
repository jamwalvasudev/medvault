import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronRight } from 'lucide-react';
import { api, type Visit } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageHeader from '@/components/PageHeader';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Visit[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const r = await api.visits.search(query);
      setResults(r);
      setSearched(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <PageHeader title="Search" backHref="/" />
      <main className="w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input className="pl-9" placeholder="Search visits, doctors, diagnoses…"
              value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
          </div>
          <Button type="submit" disabled={loading}>{loading ? '…' : 'Search'}</Button>
        </form>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
          </div>
        ) : searched && results.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No results for "{query}"</p>
        ) : (
          <div className="space-y-2">
            {results.map((v) => (
              <Card key={v.id} className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/visits/${v.id}`)}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">{v.visitDate}</span>
                      {v.specialty && <Badge variant="outline" className="text-xs">{v.specialty}</Badge>}
                    </div>
                    <p className="font-semibold text-sm text-foreground">{v.doctorName}</p>
                    {v.clinic && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />{v.clinic}
                      </p>
                    )}
                    {v.diagnosis && <p className="text-xs text-muted-foreground line-clamp-1">{v.diagnosis}</p>}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
