// Runs before paint so the stored theme is applied without a light-mode flash.
// Rendered as a blocking <script> in app/layout.tsx.
export function ThemeScript() {
  const code = `try{var s=localStorage.getItem("myshift-theme");var d=s?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
