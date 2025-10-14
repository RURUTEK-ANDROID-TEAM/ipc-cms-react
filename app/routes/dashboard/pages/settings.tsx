import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    <div className="flex items-center justify-center w-full h-full">
      <div className="flex w-full h-full max-w-5xl flex-col gap-6">
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="security">Access & Security</TabsTrigger>
            <TabsTrigger value="notifications">
              Notifications & Emails
            </TabsTrigger>
          </TabsList>
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when you&apos;re
                  done.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-name">Name</Label>
                  <Input id="tabs-demo-name" defaultValue="Pedro Duarte" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-username">Username</Label>
                  <Input id="tabs-demo-username" defaultValue="@peduarte" />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Change your password here. After saving, you&apos;ll be logged
                  out.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-current">Current password</Label>
                  <Input id="tabs-demo-current" type="password" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-new">New password</Label>
                  <Input id="tabs-demo-new" type="password" />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button>Save password</Button>
              </CardFooter>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Account</CardTitle>
                <CardDescription>
                  Make changes to your account here. Click save when you&apos;re
                  done.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-name">Name</Label>
                  <Input id="tabs-demo-name" defaultValue="Pedro Duarte" />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="tabs-demo-username">Username</Label>
                  <Input id="tabs-demo-username" defaultValue="@peduarte" />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button>Save changes</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
