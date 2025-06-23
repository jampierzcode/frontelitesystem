import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

const BarcodeGenerator = ({ ids }) => {
  const barcodeRefs = useRef({});

  useEffect(() => {
    ids.forEach((id) => {
      const svg = barcodeRefs.current[id];
      if (svg) {
        JsBarcode(svg, id.toString(), {
          format: "CODE128",
          lineColor: "#000",
          width: 2,
          height: 60,
          displayValue: true,
        });
      }
    });
  }, [ids]);

  return (
    <div className="space-y-6 w-full">
      {ids.map((id) => (
        <div key={id} className="flex flex-col items-center">
          <svg ref={(el) => (barcodeRefs.current[id] = el)} />
        </div>
      ))}
    </div>
  );
};

export default BarcodeGenerator;
