import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, type ReactNode } from "react";
import { useOutletContext } from "react-router";

type OutletHeaderSetter = {
  setHeader?: (ctx: {
    title?: string;
    actions?: ReactNode | null;
    breadcrumb?: { title: string; path: string }[];
  }) => void;
};

const Settings = () => {
  const outlet = useOutletContext<OutletHeaderSetter>();

  useEffect(() => {
    outlet?.setHeader?.({
      title: "Settings",
      actions: <></>,
      breadcrumb: [
        { title: "Dashboard", path: "/dashboard" },
        { title: "Settings", path: "dashboard/settings" },
      ],
    });
    return () => outlet?.setHeader?.({ title: undefined, actions: null });
  }, []);

  return (
    <>
      <div className="flex justify-center m-8 md:m-0">
        <form className="w-full max-w-4xl">
          <FieldSet>
            <FieldLegend>General</FieldLegend>
            <FieldDescription>
              Fill in your profile information.
            </FieldDescription>
            <FieldSeparator />
            <FieldGroup>
              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <FieldDescription>
                    Provide your full name for identification.
                  </FieldDescription>
                </FieldContent>
                <Input id="name" placeholder="Rurutek" required />
              </Field>
              <FieldSeparator />

              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="message">Message</FieldLabel>
                  <FieldDescription>
                    You can write your message here. Keep it short, preferably
                    under 100 characters.
                  </FieldDescription>
                </FieldContent>
                <Textarea
                  id="message"
                  placeholder="Hello, world!"
                  required
                  className="min-h-[100px] resize-none sm:min-w-[300px]"
                />
              </Field>

              <FieldSeparator />

              <div className="flex gap-4 justify-center">
                <Button type="submit" className="dark:text-white">
                  Submit
                </Button>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>
      <div className="flex justify-center m-8 md:m-0">
        <form className="w-full max-w-4xl">
          <FieldSet>
            <FieldLegend>Access and Security</FieldLegend>
            <FieldDescription>
              Fill in your profile information.
            </FieldDescription>
            <FieldSeparator />
            <FieldGroup>
              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <FieldDescription>
                    Provide your full name for identification.
                  </FieldDescription>
                </FieldContent>
                <Input id="name" placeholder="Evil Rabbit" required />
              </Field>

              <FieldSeparator />

              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="message">Message</FieldLabel>
                  <FieldDescription>
                    You can write your message here. Keep it short, preferably
                    under 100 characters.
                  </FieldDescription>
                </FieldContent>
                <Textarea
                  id="message"
                  placeholder="Hello, world!"
                  required
                  className="min-h-[100px] resize-none sm:min-w-[300px]"
                />
              </Field>

              <FieldSeparator />

              <div className="flex gap-4 justify-center">
                <Button type="submit" className="dark:text-white">
                  Submit
                </Button>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>
      <div className="flex justify-center m-8 md:m-0">
        <form className="w-full max-w-4xl">
          <FieldSet>
            <FieldLegend>Notifications and Emails</FieldLegend>
            <FieldDescription>
              Fill in your profile information.
            </FieldDescription>
            <FieldSeparator />
            <FieldGroup>
              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="name">Name</FieldLabel>
                  <FieldDescription>
                    Provide your full name for identification.
                  </FieldDescription>
                </FieldContent>
                <Input id="name" placeholder="Evil Rabbit" required />
              </Field>

              <FieldSeparator />

              <Field orientation="responsive">
                <FieldContent>
                  <FieldLabel htmlFor="message">Message</FieldLabel>
                  <FieldDescription>
                    You can write your message here. Keep it short, preferably
                    under 100 characters.
                  </FieldDescription>
                </FieldContent>
                <Textarea
                  id="message"
                  placeholder="Hello, world!"
                  required
                  className="min-h-[100px] resize-none sm:min-w-[300px]"
                />
              </Field>

              <FieldSeparator />

              <div className="flex gap-4 justify-center">
                <Button type="submit" className="dark:text-white">
                  Submit
                </Button>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </div>
            </FieldGroup>
          </FieldSet>
        </form>
      </div>
    </>
  );
};

export default Settings;
