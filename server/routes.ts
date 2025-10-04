import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { unitStatuses, type UnitUpdateRequest } from "@shared/schema";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(unitStatuses),
});

const updatePriceSchema = z.object({
  price: z.number().positive(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Units endpoints
  app.get("/api/units", async (req, res) => {
    try {
      const units = await storage.getAllUnits();
      res.json(units);
    } catch (error) {
      console.error("Error fetching units:", error);
      res.status(500).json({ error: "Failed to fetch units" });
    }
  });

  app.get("/api/units/:id", async (req, res) => {
    try {
      const unit = await storage.getUnitById(req.params.id);
      if (!unit) {
        return res.status(404).json({ error: "Unit not found" });
      }
      res.json(unit);
    } catch (error) {
      console.error("Error fetching unit:", error);
      res.status(500).json({ error: "Failed to fetch unit" });
    }
  });

  app.put("/api/units/:id/status", async (req, res) => {
    try {
      const validation = updateStatusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const updatedUnit = await storage.updateUnitStatus(req.params.id, validation.data.status);
      
      if (!updatedUnit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      // Broadcast update to all WebSocket clients
      broadcastUnitUpdate(updatedUnit);

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit status:", error);
      res.status(500).json({ error: "Failed to update unit status" });
    }
  });

  app.put("/api/units/:id/price", async (req, res) => {
    try {
      const validation = updatePriceSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: validation.error.message });
      }

      const updatedUnit = await storage.updateUnitPrice(req.params.id, validation.data.price);
      
      if (!updatedUnit) {
        return res.status(404).json({ error: "Unit not found" });
      }

      // Broadcast update to all WebSocket clients
      broadcastUnitUpdate(updatedUnit);

      res.json(updatedUnit);
    } catch (error) {
      console.error("Error updating unit price:", error);
      res.status(500).json({ error: "Failed to update unit price" });
    }
  });

  // Leads endpoints
  app.get("/api/leads", async (req, res) => {
    try {
      const leads = await storage.getAllLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  app.get("/api/leads/:id", async (req, res) => {
    try {
      const lead = await storage.getLeadById(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ error: "Failed to fetch lead" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message: string) => {
      console.log('Received message:', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    // Send initial connection confirmation
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected successfully' }));
    }
  });

  // Function to broadcast unit updates to all connected clients
  function broadcastUnitUpdate(unit: any) {
    const message = JSON.stringify({
      type: 'unit_update',
      data: unit,
    });

    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Store broadcast function globally so it can be used from routes
  (global as any).broadcastUnitUpdate = broadcastUnitUpdate;

  return httpServer;
}
