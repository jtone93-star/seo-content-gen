import { contextBridge } from "electron";

contextBridge.exposeInMainWorld("seoTurtleDesktop", {
  isDesktop: true,
});
