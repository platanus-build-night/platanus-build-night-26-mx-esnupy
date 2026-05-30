"use client";

import { useEffect, useState } from "react";

/** Formatea fechas en es-MX solo en el cliente para evitar errores de hidratación. */
export const FormattedDate = ({ value }: { value?: string }) => {
  const [formatted, setFormatted] = useState("—");

  useEffect(() => {
    if (!value) {
      setFormatted("—");
      return;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      setFormatted(value);
      return;
    }
    setFormatted(
      new Intl.DateTimeFormat("es-MX", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date),
    );
  }, [value]);

  return <span suppressHydrationWarning>{formatted}</span>;
};
