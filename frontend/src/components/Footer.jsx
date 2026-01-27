export default function Footer() {
  return (
    <footer className="w-full py-4 border-t flex flex-col items-center text-sm text-gray-600 text-center">
      <p className="flex flex-col items-center gap-1">
        Developed  <span className="text-red-500"></span> by{" "}
        <a
          href="https://www.linkedin.com/in/innocent-kiwoly-35b8b1355/"
          target="_blank"
          className="text-blue-600 hover:underline"
        >
          Kiwoly, Innocent 
        </a>
      </p>

      <div className="flex flex-col items-center gap-1 mt-2">
        <a
          href="mailto:ikiwoly@gmail.com"
          className="text-blue-600 hover:underline"
        >
          ikiwoly@gmail.com{" "}
        </a>

        <span className="flex items-center gap-1 text-gray-500 text-sm">
          <i className="bi bi-geo-alt-fill" style={{ fontSize: "20px" }}></i>
          Dar es Salaam, Tanzania
        </span>
      </div>
    </footer>
  );
}

