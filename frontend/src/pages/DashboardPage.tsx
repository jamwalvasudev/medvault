import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MapPin, ChevronRight } from 'lucide-react';
import { api, type Visit } from '@/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PageHeader from '@/components/PageHeader';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.visits
      .list()
      .then((v) => { setVisits(v); setLoading(false); })
      .catch((e) => { setError(e.message); setLoading(false); });
  }, []);

  const byYear = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const year = v.visitDate.slice(0, 4);
    (acc[year] ??= []).push(v);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <div className="flex flex-col flex-1">
      <PageHeader
        title="Your Visits"
        actions={
          <Button size="sm" onClick={() => navigate('/visits/new')}>
            <Plus className="h-4 w-4 mr-1" />
            Add Visit
          </Button>
        }
      />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : visits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <p className="text-muted-foreground">No visits yet.</p>
            <Button onClick={() => navigate('/visits/new')}>
              <Plus className="h-4 w-4 mr-1" />
              Add your first visit
            </Button>
          </div>
        ) : (
          years.map((year) => (
            <section key={year}>
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {year}
              </p>
              <div className="space-y-2">
                {byYear[year].map((v) => (
                  <Card
                    key={v.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate(`/visits/${v.id}`)}
                  >
                    <CardContent className="flex items-start justify-between gap-4 p-4">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">{v.visitDate}</span>
                          {v.specialty && (
                            <Badge variant="outline" className="text-xs">
                              {v.specialty}
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-foreground">{v.doctorName}</p>
                        {v.clinic && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {v.clinic}
                          </p>
                        )}
                        {v.diagnosis && (
                          <p className="text-xs text-muted-foreground line-clamp-1">{v.diagnosis}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))
        )}
      </main>
    </div>
  );
}
