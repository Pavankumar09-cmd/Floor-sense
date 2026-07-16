import { Request, Response } from 'express';
import db from '../config/database';

export async function getProjects(req: Request, res: Response) {
  try {
    const projects = await db('projects').select('*').orderBy('created_at', 'desc');
    
    // Fetch machines for each project
    const projectsWithMachines = await Promise.all(
      projects.map(async (project) => {
        const machines = await db('machines').where('project_id', project.id).select('id', 'name', 'machine_type');
        return { ...project, machines };
      })
    );

    res.json(projectsWithMachines);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function getProject(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const project = await db('projects').where('id', id).first();
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const machines = await db('machines').where('project_id', id).select('*');
    res.json({ ...project, machines });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function createProject(req: Request, res: Response) {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const id = 'proj_' + Math.random().toString(36).substring(2, 9);
  try {
    await db('projects').insert({
      id,
      name,
      description,
      created_at: new Date()
    });
    const newProject = await db('projects').where('id', id).first();
    res.status(201).json(newProject);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const deleted = await db('projects').where('id', id).delete();
    if (!deleted) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
