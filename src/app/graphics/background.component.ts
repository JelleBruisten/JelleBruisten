import { Component, ElementRef, inject } from "@angular/core";
import { BackgroundProgramManager } from "./manager";
import { RenderStrategy } from "./types";

@Component({
  selector: 'app-background',
  template: ``,
  host: {
    'class': 'fixed bg-red-500 z-0'
  }
})
export class BackgroundComponent {
  private readonly host = inject(ElementRef);
  private readonly programManager = inject(BackgroundProgramManager);
  private program: { 
    strategy: RenderStrategy; 
    programHandle: { 
      stop: () => void; 
    } | null | undefined; 
    canvas: HTMLCanvasElement; 
  } | null = null;

  constructor() {
    this.startBackground();
  }

  async startBackground() {
    const program = await this.programManager.createBackgroundProgram();
    this.program = program;
    if(program) {    
      (this.host.nativeElement as HTMLElement).replaceChildren(program.canvas);
    }
  } 
}