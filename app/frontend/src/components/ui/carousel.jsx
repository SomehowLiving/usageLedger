import React from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CarouselContext = React.createContext(null);
export function Carousel({ opts, plugins, orientation = "horizontal", setApi, className, children, ...props }) {
  const [carouselRef, api] = useEmblaCarousel({ ...opts, axis: orientation === "horizontal" ? "x" : "y" }, plugins);
  React.useEffect(() => { if (api && setApi) setApi(api); }, [api, setApi]);
  return <CarouselContext.Provider value={{ carouselRef, api, orientation }}><div className={cn("relative", className)} role="region" {...props}>{children}</div></CarouselContext.Provider>;
}
export function CarouselContent({ className, ...props }) {
  const { carouselRef, orientation } = React.useContext(CarouselContext);
  return <div ref={carouselRef} className="overflow-hidden"><div className={cn("flex", orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col", className)} {...props} /></div>;
}
export function CarouselItem({ className, ...props }) {
  const { orientation } = React.useContext(CarouselContext);
  return <div role="group" className={cn("min-w-0 shrink-0 grow-0 basis-full", orientation === "horizontal" ? "pl-4" : "pt-4", className)} {...props} />;
}
export function CarouselPrevious({ className, ...props }) {
  const { api } = React.useContext(CarouselContext);
  return <Button variant="outline" size="icon" className={cn("absolute h-8 w-8 rounded-full -left-12 top-1/2 -translate-y-1/2", className)} onClick={() => api?.scrollPrev()} {...props}><ArrowLeft className="h-4 w-4" /></Button>;
}
export function CarouselNext({ className, ...props }) {
  const { api } = React.useContext(CarouselContext);
  return <Button variant="outline" size="icon" className={cn("absolute h-8 w-8 rounded-full -right-12 top-1/2 -translate-y-1/2", className)} onClick={() => api?.scrollNext()} {...props}><ArrowRight className="h-4 w-4" /></Button>;
}
