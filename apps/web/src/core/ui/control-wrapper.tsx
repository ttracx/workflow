import { JSONSocket } from "@seocraft/core/src/controls/socket-generator";
import { useRef } from "react";
import { getControl } from "../control";
import { ControlContainer } from "./control-container";

export const ControlWrapper: React.FC<{
  control: any;
  definition: JSONSocket;
}> = ({ control, definition }) => {
  const ref = useRef<HTMLDivElement>(null);
  const ControlElement = getControl({
    element: ref.current!,
    type: "control",
    payload: control,
  });

  console.log("ControlWrapper", control, definition);

  return (
    <>
      <div
        className="flex flex-1 flex-col"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <ControlContainer
          id={control?.id || "something"}
          definition={definition}
        >
          <ControlElement data={control} />
        </ControlContainer>
      </div>
    </>
  );
};
