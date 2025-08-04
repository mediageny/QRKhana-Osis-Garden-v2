import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QRCodeDisplayProps {
  tableId: number;
  tableName: string;
}

export default function QRCodeDisplay({ tableId, tableName }: QRCodeDisplayProps) {
  const [showQR, setShowQR] = useState(false);

  const { data: qrData, isLoading } = useQuery({
    queryKey: ["/api/tables", tableId, "qr"],
    enabled: showQR,
  });

  const downloadQR = () => {
    if (!qrData?.qrCode) return;

    const link = document.createElement('a');
    link.download = `${tableName}-qr-code.png`;
    link.href = qrData.qrCode;
    link.click();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          {tableName}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQR(!showQR)}
          >
            {showQR ? "Hide QR" : "Show QR"}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {showQR && (
          <div className="text-center">
            {isLoading ? (
              <div className="w-48 h-48 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <i className="fas fa-spinner fa-spin text-2xl text-gray-400"></i>
              </div>
            ) : qrData ? (
              <div>
                <img 
                  src={qrData.qrCode} 
                  alt={`QR Code for ${tableName}`}
                  className="w-48 h-48 mx-auto mb-4 border rounded-lg"
                />
                <p className="text-sm text-gray-600 mb-4">{qrData.url}</p>
                <Button onClick={downloadQR} size="sm">
                  <i className="fas fa-download mr-2"></i>Download QR
                </Button>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
