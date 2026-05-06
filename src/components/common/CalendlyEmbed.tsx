import React, { useEffect } from 'react';

interface CalendlyEmbedProps {
  url: string;
}

export default function CalendlyEmbed({ url }: CalendlyEmbedProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div id="calendly-demo" className="w-full flex justify-center py-12 bg-white">
      <div 
        className="calendly-inline-widget w-full" 
        data-url={url}
        style={{ minWidth: '320px', height: '700px' }}
      ></div>
    </div>
  );
}
