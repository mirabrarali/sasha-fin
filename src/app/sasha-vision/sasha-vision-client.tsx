
'use client';

import { useState, useRef, useEffect } from 'react';
import NextImage from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import { LanguageToggle } from '@/components/language-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';
import { Eye, Upload, Video, Image as ImageIcon, Sparkles, Loader2, Download, RefreshCw, XCircle } from 'lucide-react';
import { generateImageFromText } from '@/ai/flows/generate-image-from-text';
import { upscaleImage } from '@/ai/flows/upscale-image';
import { SashaStatus } from '@/components/sasha-status';

type Mode = 'generate' | 'upscale';

const formSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters.'),
});

export default function SashaVisionClient() {
  const { t, dir } = useLanguage();
  const { toast } = useToast();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [hasMounted, setHasMounted] = useState(false);

  const [mode, setMode] = useState<Mode>('generate');
  const [isLoading, setIsLoading] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { prompt: '' },
  });
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const handleReset = () => {
    setResultImage(null);
    setSourceImage(null);
    setPrompt('');
    form.reset();
    setIsLoading(false);
    if(imageInputRef.current) {
        imageInputRef.current.value = '';
    }
  }

  const handleTextToImage = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setResultImage(null);
    setSourceImage(null);
    setPrompt(values.prompt);
    
    try {
      const result = await generateImageFromText({ prompt: values.prompt });
      setResultImage(result.imageUrl);
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: t('imageGenFailedTitle'), description: t('imageGenFailedDesc') });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setSourceImage(dataUri);
        setResultImage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpscaleImage = async () => {
    if (!sourceImage) return;
    
    setIsLoading(true);
    setResultImage(null);
    setPrompt('Upscaled Image');

    try {
      const result = await upscaleImage({ imageDataUri: sourceImage });
      setResultImage(result.imageUrl);
    } catch (error) {
       console.error(error);
      toast({ variant: 'destructive', title: t('imageUpscaleFailedTitle'), description: t('imageUpscaleFailedDesc') });
    } finally {
        setIsLoading(false);
    }
  }
  
  const handleDownload = () => {
    if (resultImage) {
      const link = document.createElement('a');
      link.href = resultImage;
      link.download = `sasha-vision-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
  
  if (!hasMounted) {
    return (
        <div className="flex flex-col h-screen bg-muted/40 text-foreground" dir={dir}>
            <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background">
                <div className="justify-self-start">
                    <SidebarTrigger />
                </div>
                <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('sashaVisionTitle')}</h1>
                <div className="justify-self-end">
                    <LanguageToggle />
                </div>
            </header>
            <main className="flex-1 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </main>
        </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-muted/40 text-foreground" dir={dir}>
      <header className="grid grid-cols-3 items-center p-4 border-b shrink-0 bg-background relative z-50">
        <div className="justify-self-start">
          <SidebarTrigger />
        </div>
        <h1 className="text-xl font-semibold tracking-tight justify-self-center">{t('sashaVisionTitle')}</h1>
        <div className="justify-self-end flex items-center gap-2">
            <SashaStatus />
            <LanguageToggle />
        </div>
      </header>

      <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                  
                  {/* Left Panel: Controls */}
                  <Card className="shadow-lg animate-in fade-in-50 duration-500">
                      <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                          <Eye className="w-6 h-6 text-primary"/>
                          {t('sashaVisionTitle')}
                          </CardTitle>
                          <CardDescription>{t('sashaVisionDesc')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                          <Tabs value={mode} onValueChange={(v) => { handleReset(); setMode(v as Mode) }} className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="generate"><ImageIcon className="mr-2"/>{t('textToImageTitle')}</TabsTrigger>
                                  <TabsTrigger value="upscale"><Sparkles className="mr-2"/>{t('imageEnhancementTitle')}</TabsTrigger>
                              </TabsList>
                              <TabsContent value="generate" className="pt-4">
                                  <Form {...form}>
                                  <form onSubmit={form.handleSubmit(handleTextToImage)} className="space-y-6">
                                      <FormField
                                      control={form.control}
                                      name="prompt"
                                      render={({ field }) => (
                                          <FormItem>
                                          <FormLabel>{t('promptLabel')}</FormLabel>
                                          <FormControl>
                                              <Textarea placeholder={t('promptPlaceholder')} {...field} rows={4} className="text-base" />
                                          </FormControl>
                                          <FormMessage />
                                          </FormItem>
                                      )}
                                      />
                                      <Button type="submit" disabled={isLoading} className="w-full">
                                          {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                                          {t('generateButton')}
                                      </Button>
                                  </form>
                                  </Form>
                              </TabsContent>
                              <TabsContent value="upscale" className="pt-4">
                                  <div className="space-y-4">
                                      <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                                      {!sourceImage ? (
                                          <Button onClick={() => imageInputRef.current?.click()} className="w-full" variant="outline">
                                              <Upload className="mr-2"/>
                                              {t('uploadButton')}
                                          </Button>
                                      ) : (
                                          <div className="space-y-4">
                                              <div className="relative aspect-video w-full border rounded-md overflow-hidden bg-muted">
                                                  <NextImage src={sourceImage} alt="Uploaded image" layout="fill" objectFit="contain" />
                                                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full h-7 w-7" onClick={() => { setSourceImage(null); if(imageInputRef.current) imageInputRef.current.value = ''; }}>
                                                      <XCircle className="h-5 w-5" />
                                                  </Button>
                                              </div>
                                              <Button onClick={handleUpscaleImage} disabled={isLoading || !sourceImage} className="w-full">
                                                  {isLoading ? <Loader2 className="mr-2 animate-spin" /> : <Sparkles className="mr-2" />}
                                                  {t('upscaleButton')}
                                              </Button>
                                          </div>
                                      )}
                                  </div>
                              </TabsContent>
                          </Tabs>
                      </CardContent>
                  </Card>

                  {/* Right Panel: Result */}
                  <Card className="shadow-lg animate-in fade-in-50 duration-700">
                      <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                              {t('resultTitle')}
                              {(resultImage || isLoading) && 
                                  <Button variant="ghost" size="sm" onClick={handleReset}>
                                      <RefreshCw className="mr-2 h-4 w-4"/>
                                      {t('startOver')}
                                  </Button>
                              }
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <div className="relative aspect-square w-full bg-muted/50 rounded-lg flex items-center justify-center border-2 border-dashed">
                              {isLoading ? (
                                  <div className="text-center text-muted-foreground space-y-2">
                                      <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
                                      <p>{mode === 'generate' ? t('generatingMessage') : t('upscalingMessage')}</p>
                                  </div>
                              ) : resultImage ? (
                                  <>
                                      <NextImage src={resultImage} alt={prompt || "AI Generated Image"} layout="fill" objectFit="cover" className="rounded-lg" />
                                      <div className="absolute bottom-4 right-4">
                                          <Button onClick={handleDownload} size="lg" className="shadow-xl">
                                              <Download className="mr-2" />
                                              {t('downloadButton')}
                                          </Button>
                                      </div>
                                  </>
                              ) : (
                                  <div className="text-center text-muted-foreground p-8">
                                      <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                                      <p>{t('noResult')}</p>
                                  </div>
                              )}
                          </div>
                      </CardContent>
                  </Card>

              </div>
          </div>
      </main>
    </div>
  );
}

    