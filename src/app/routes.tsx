import { createBrowserRouter } from "react-router";
import { Root } from "./components/Root";
import { Home } from "./components/Home";
import { Works } from "./components/Works";
import { Gallery } from "./components/Gallery";
import { About } from "./components/About";
import { Apps } from "./components/Apps";
import { Admin } from "./components/Admin";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: Home },
      { path: "works", Component: Works },
      { path: "gallery", Component: Gallery },
      { path: "about", Component: About },
      { path: "apps", Component: Apps },
      { path: "admin", Component: Admin },
      { path: "*", Component: NotFound },
    ],
  },
]);
