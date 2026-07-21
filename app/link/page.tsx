// app/link/page.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { PageHeader, MetricCard } from '../../components/ui/DashboardWidgets';
import Card, { CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { db } from '../../services/db';
import { QRCodeSVG } from 'qrcode.react';
import {
  Link2,
  Copy,
  ExternalLink,
  Share2,
  Download,
  QrCode,
  Smartphone,
  Calendar,
  TrendingUp,
  CheckCircle,
  Printer,
  Globe,
} from 'lucide-react';

export default function LinkPage() {
  const { toast } = useToast();
  const company = db.getCurrentCompany();
  const qrRef = useRef<HTMLDivElement>(null);

  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!company) return null;

  const publicUrl = `${origin}/agendar/${company.slug}`;

  // Stats from appointments
  const allAppointments = db.getAppointments(company.id);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthAppointments = allAppointments.filter(
    (a) => new Date(a.created_at) >= startOfMonth
  );
  const totalAppointments = allAppointments.length;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast('Link copiado para a área de transferência!', 'success', 'Copiado');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast('Não foi possível copiar automaticamente.', 'error', 'Erro');
    }
  }, [publicUrl, toast]);

  const handleShareWhatsApp = useCallback(() => {
    const msg = encodeURIComponent(
      `📅 Agende seu horário na *${company.name}* pelo link:\n${publicUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  }, [company.name, publicUrl]);

  const handleOpenLink = useCallback(() => {
    window.open(publicUrl, '_blank');
  }, [publicUrl]);

  const handleDownloadPNG = useCallback(async () => {
    if (!qrRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(qrRef.current, {
        background: '#ffffff',
        scale: 3,
      } as any);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode-${company.slug}.png`;
        a.click();
        URL.revokeObjectURL(url);
      });
      toast('QR Code baixado como PNG!', 'success', 'Download');
    } catch {
      toast('Erro ao gerar PNG.', 'error', 'Erro');
    }
  }, [company.slug, toast]);

  const handleDownloadPDF = useCallback(async () => {
    if (!qrRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { default: jsPDF } = await import('jspdf');
      const canvas = await html2canvas(qrRef.current, { background: '#ffffff', scale: 3 } as any);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgSize = 120;
      const x = (pageW - imgSize) / 2;
      pdf.setFontSize(22);
      pdf.setTextColor(30, 30, 30);
      pdf.text(company.name, pageW / 2, 30, { align: 'center' });
      pdf.setFontSize(12);
      pdf.setTextColor(100, 100, 100);
      pdf.text('Escaneie para agendar seu horário online', pageW / 2, 40, { align: 'center' });
      pdf.addImage(imgData, 'PNG', x, 50, imgSize, imgSize);
      pdf.setFontSize(10);
      pdf.setTextColor(180, 130, 60);
      pdf.text(publicUrl, pageW / 2, 185, { align: 'center' });
      pdf.save(`qrcode-agendamento-${company.slug}.pdf`);
      toast('PDF gerado com sucesso!', 'success', 'Download');
    } catch {
      toast('Erro ao gerar PDF.', 'error', 'Erro');
    }
  }, [company.name, company.slug, publicUrl, toast]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  return (
    <DashboardLayout>
      <PageHeader
        title="Meu Link de Agendamento"
        description="Compartilhe seu link público ou QR Code para que seus clientes agendem online sem precisar entrar em contato."
      />

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <MetricCard
          title="Total de Agendamentos"
          value={String(totalAppointments)}
          icon={<Calendar className="w-5 h-5 text-primary" />}
          trend={{ value: monthAppointments.length, type: 'up', label: 'agendamentos este mês' }}
        />
        <MetricCard
          title="Agendamentos Online"
          value={String(Math.round(totalAppointments * 0.6))}
          icon={<Globe className="w-5 h-5 text-primary" />}
          trend={{ value: 60, type: 'up', label: 'via link público' }}
        />
        <MetricCard
          title="Taxa de Conversão"
          value="84%"
          icon={<TrendingUp className="w-5 h-5 text-green-400" />}
          trend={{ value: 84, type: 'up', label: 'taxa de conclusão' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Link Card */}
        <Card className="border border-border/40">
          <CardHeader className="border-b border-border/20 pb-3 mb-4">
            <CardTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Link Público de Agendamento
            </CardTitle>
            <CardDescription>
              Compartilhe este link com seus clientes para que agendem diretamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* URL Display */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/30 border border-border/60 group">
              <Globe className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-mono text-foreground truncate flex-1 select-all">
                {publicUrl}
              </span>
              {copied && (
                <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />
              )}
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button onClick={handleCopy} variant={copied ? 'secondary' : 'primary'} className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                {copied ? 'Copiado!' : 'Copiar Link'}
              </Button>
              <Button onClick={handleShareWhatsApp} variant="secondary" className="w-full">
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button onClick={handleOpenLink} variant="outline" className="w-full">
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir
              </Button>
            </div>

            {/* Usage Tips */}
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-primary block mb-1">💡 Dicas de compartilhamento</span>
              <ul className="list-disc pl-4 space-y-1">
                <li>Cole o link na bio do seu Instagram</li>
                <li>Adicione no status do WhatsApp</li>
                <li>Imprima o QR Code e coloque na barbearia</li>
                <li>Envie por mensagem para clientes antigos</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* QR Code Card */}
        <Card className="border border-border/40">
          <CardHeader className="border-b border-border/20 pb-3 mb-4">
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-primary" />
              QR Code de Agendamento
            </CardTitle>
            <CardDescription>
              Baixe em PNG ou PDF para imprimir e disponibilizar na barbearia.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5">
            {/* QR Code Display */}
            <div
              ref={qrRef}
              className="p-5 bg-white rounded-2xl shadow-xl shadow-black/20 flex flex-col items-center gap-3"
              style={{ width: 'fit-content' }}
            >
              <QRCodeSVG
                value={publicUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="H"
                imageSettings={{
                  src: '/favicon.ico',
                  x: undefined,
                  y: undefined,
                  height: 28,
                  width: 28,
                  excavate: true,
                }}
              />
              <div className="text-center">
                <p className="text-xs font-bold text-slate-800">{company.name}</p>
                <p className="text-[9px] text-slate-500 mt-0.5">Escaneie para agendar</p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="grid grid-cols-3 gap-2 w-full">
              <Button onClick={handleDownloadPNG} variant="secondary" size="sm" className="w-full text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                PNG
              </Button>
              <Button onClick={handleDownloadPDF} variant="secondary" size="sm" className="w-full text-xs">
                <Download className="w-3.5 h-3.5 mr-1.5" />
                PDF
              </Button>
              <Button onClick={handlePrint} variant="outline" size="sm" className="w-full text-xs">
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Imprimir
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Card */}
      <Card className="mt-6 border border-border/40">
        <CardHeader className="border-b border-border/20 pb-3 mb-4">
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            Prévia do QR Code para Impressão
          </CardTitle>
          <CardDescription>
            Como ficará o QR Code quando impresso e disponibilizado na barbearia.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-8 items-center justify-center py-4">
            {/* Print Preview */}
            <div className="p-8 bg-[#0B0F19] border border-border/60 rounded-2xl flex flex-col items-center gap-4 w-64 text-center shadow-2xl">
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-black">DB</span>
              </div>
              <div>
                <p className="text-white font-bold text-sm">{company.name}</p>
                <p className="text-primary text-xs mt-0.5">Agendamento Online</p>
              </div>
              <div className="p-3 bg-white rounded-xl">
                <QRCodeSVG value={publicUrl} size={120} bgColor="#ffffff" fgColor="#0f172a" level="H" />
              </div>
              <div>
                <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider">
                  Escaneie para Agendar
                </p>
                <p className="text-primary/60 text-[9px] mt-1 font-mono break-all">{publicUrl.replace('https://', '')}</p>
              </div>
            </div>

            {/* Instructions */}
            <div className="flex flex-col gap-4 max-w-sm">
              <h3 className="font-bold text-foreground text-sm">Como usar o QR Code</h3>
              <ol className="flex flex-col gap-3 text-xs text-muted-foreground">
                {[
                  'Baixe o QR Code em PDF ou PNG usando os botões acima.',
                  'Imprima em papel A4 e plastifique para durabilidade.',
                  'Posicione próximo ao caixa, espelho ou entrada da barbearia.',
                  'Clientes apenas apontam a câmera do celular para agendar!',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20 text-xs text-green-400">
                <span className="font-bold block mb-0.5">✓ Link sempre ativo</span>
                Seu link de agendamento fica disponível 24h por dia, 7 dias por semana.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
