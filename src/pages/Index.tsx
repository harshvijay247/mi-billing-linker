import { useState } from 'react';
import { FileDropZone } from '@/components/FileDropZone';
import { ProcessingStatus, StatusType } from '@/components/ProcessingStatus';
import { ResultsTable } from '@/components/ResultsTable';
import { processFiles, generateExcelDownload, ProcessingResult } from '@/lib/fileProcessor';
import { Button } from '@/components/ui/button';
import { Download, RefreshCw, FileSpreadsheet, Archive, ArrowRight } from 'lucide-react';

const Index = () => {
  const [miFile, setMiFile] = useState<File | null>(null);
  const [billingZipFile, setBillingZipFile] = useState<File | null>(null);
  const [status, setStatus] = useState<StatusType>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusDetails, setStatusDetails] = useState<string | undefined>();
  const [result, setResult] = useState<ProcessingResult | null>(null);

  const handleProcess = async () => {
    if (!miFile || !billingZipFile) {
      setStatus('error');
      setStatusMessage('Please upload both files');
      return;
    }

    setStatus('processing');
    setStatusMessage('Processing files...');
    setStatusDetails(undefined);

    try {
      const processingResult = await processFiles(miFile, billingZipFile);
      
      if (processingResult.success) {
        setStatus('success');
        setStatusMessage('Processing complete');
        setStatusDetails(`${processingResult.matchedCount} matches found`);
        setResult(processingResult);
      } else {
        setStatus('error');
        setStatusMessage(processingResult.error || 'Processing failed');
        setResult(null);
      }
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'An error occurred');
      setResult(null);
    }
  };

  const handleDownload = () => {
    if (result) {
      generateExcelDownload(result.headers, result.data);
    }
  };

  const handleReset = () => {
    setMiFile(null);
    setBillingZipFile(null);
    setStatus('idle');
    setStatusMessage('');
    setStatusDetails(undefined);
    setResult(null);
  };

  const canProcess = miFile && billingZipFile && status !== 'processing';

  return (
    <div className="min-h-screen bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-10 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            MI & Billing <span className="text-gradient">Data Matcher</span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Match serial numbers from MI file with billing data and merge results
          </p>
        </header>

        {/* File Upload Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Input 1: MI File</h2>
            </div>
            <FileDropZone
              accept=".xlsx,.xls,.csv"
              label="MI Master File"
              description="Excel file with New Serial No. in column F"
              icon="excel"
              onFileSelect={setMiFile}
              selectedFile={miFile}
            />
          </div>

          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-foreground">Input 2: Billing ZIP</h2>
            </div>
            <FileDropZone
              accept=".zip"
              label="Billing ZIP File"
              description="Contains 2 split billing files"
              icon="zip"
              onFileSelect={setBillingZipFile}
              selectedFile={billingZipFile}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <Button
            onClick={handleProcess}
            disabled={!canProcess}
            className="btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Process & Match Data
          </Button>

          {result && (
            <Button
              onClick={handleDownload}
              variant="outline"
              className="border-accent text-accent hover:bg-accent/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Result
            </Button>
          )}

          {(miFile || billingZipFile || result) && (
            <Button
              onClick={handleReset}
              variant="ghost"
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          )}

          {status !== 'idle' && (
            <ProcessingStatus
              status={status}
              message={statusMessage}
              details={statusDetails}
            />
          )}
        </div>

        {/* Instructions Card */}
        {!result && (
          <div className="glass-card p-6 mb-8 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <h3 className="font-semibold text-foreground mb-4">How It Works</h3>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload MI File</p>
                  <p className="text-sm text-muted-foreground">
                    Excel file containing New Serial No. in column F
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload Billing ZIP</p>
                  <p className="text-sm text-muted-foreground">
                    ZIP containing 2 billing split files
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-foreground">Get Results</p>
                  <p className="text-sm text-muted-foreground">
                    Matched billing data added as new column
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Table */}
        {result && result.success && (
          <ResultsTable
            headers={result.headers}
            data={result.data}
            matchedCount={result.matchedCount}
            unmatchedCount={result.unmatchedCount}
          />
        )}
      </div>
    </div>
  );
};

export default Index;
