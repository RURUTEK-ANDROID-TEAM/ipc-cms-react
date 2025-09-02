import { z } from "zod";

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const deviceSchema = z.object({
  id: z.number(),
  customer_id: z.number(),
  user_id: z.number(),
  camera_id: z.number(),
  uid: z.string(),
  mac_address: z.string(),
  ip_address: z.string(),
  firmware_version: z.string(),
  model: z.string(),
  manufacturer: z.string(),
  serial_number: z.string(),
  hardware_id: z.string(),
  assigned_at: z.string(),
});

export const groupSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  created_at: z.string(),
});

// Type definitions
export type UserType = z.infer<typeof userSchema>;
export type DeviceType = z.infer<typeof deviceSchema>;
export type GroupType = z.infer<typeof groupSchema>;
