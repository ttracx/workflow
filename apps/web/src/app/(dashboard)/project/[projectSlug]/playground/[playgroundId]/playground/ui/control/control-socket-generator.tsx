import { ClassicPreset } from "rete";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { SelectValue } from "@radix-ui/react-select";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { types } from "../../sockets";
import { Checkbox } from "@/components/ui/checkbox";

type SocketGeneratorControlOptions = {
  connectionType: "input" | "output";
  name: string;
  ignored: string[];
  tooltip: string;
  initial: {
    name: string;
    description: string;
    inputs: Socket[];
  };
  onChange: (data: any) => void;
};

export type Socket = z.infer<typeof socketSchema>;

export class SocketGeneratorControl extends ClassicPreset.Control {
  __type = "socket-generator";
  name: string;
  description?: string;
  inputs: Socket[] = [];
  constructor(public params: SocketGeneratorControlOptions) {
    super();
    this.inputs = params.initial.inputs;
    this.name = params.initial.name;
    this.description = params.initial.description;
  }

  setValue(val: { inputs: Socket[]; name: string; description?: string }) {
    this.inputs = val.inputs;
    this.name = val.name;
    this.description = val.description;
    this.params.onChange(val);
  }
}

const socketSchema = z.object({
  name: z.string().min(1).max(4),
  type: z.enum(types),
  description: z.string().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  required: z.boolean().default(false).optional(),
});

const formSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  inputs: z.array(socketSchema),
});

export function SocketGeneratorControlComponent(props: {
  data: SocketGeneratorControl;
}) {
  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      name: props.data.name,
      description: props.data.description,
      inputs: props.data.inputs,
    },
    values: {
      name: props.data.name,
      description: props.data.description,
      inputs: props.data.inputs,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    console.log([props.data.inputs]);
    form.setValue("inputs", props.data.inputs);
  }, [props.data.inputs]);

  const { fields, append, prepend, remove, swap, move, insert } = useFieldArray(
    {
      control: form.control, // control props comes from useForm (optional: if you are using FormContext)
      name: "inputs", // unique name for your Field Array
    }
  );
  const onSubmit = (data?: z.infer<typeof formSchema>) => {
    const fieldsValue = form.getValues();
    props.data.setValue(fieldsValue);
  };
  useEffect(() => {
    onSubmit();
  }, [fields.length]);
  return (
    <Form {...form}>
      <form
        onChange={form.handleSubmit(onSubmit)}
        className="flex flex-col h-full"
      >
        <FormField
          control={form.control}
          name={`name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="name" {...field} />
              </FormControl>
              <FormDescription>
                This is your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`description`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input placeholder="description" {...field} />
              </FormControl>
              <FormDescription>This is your description.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="button"
          onClick={() => append({ name: "", type: "string", description: "" })}
        >
          Add Input
        </Button>
        <ScrollArea className="max-h-fit py-4 flex flex-col">
          {fields.map((field, index) => (
            <div
              key={`field.${index}`}
              className="flex flex-col border p-2 relative @container rounded shadow mb-4"
            >
              <div className="absolute top-2 right-2">
                <Button
                  type={"button"}
                  variant={"ghost"}
                  onClick={() => remove(index)}
                >
                  <X />
                </Button>
              </div>
              <div className="grid @lg:grid-cols-3 @md:grid-cols-2 grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name={`inputs.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="shadcn" {...field} />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`inputs.${index}.type`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="min-w-fit">
                            <SelectValue placeholder="Select type for field" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {types?.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>This is type for field.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`inputs.${index}.description`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Description for the field"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        This is your public display name.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`inputs.${index}.required`}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-y-0">
                      <FormControl>
                        <Checkbox
                          className="mx-4"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Required</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          ))}
        </ScrollArea>
      </form>
    </Form>
  );
}
