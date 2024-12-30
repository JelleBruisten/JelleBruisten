import { Component, ElementRef, inject } from "@angular/core";
import { BackgroundProgramManager } from "./manager";
import { RenderProgramHandles, RenderStrategy } from "./types";
import { fromEvent } from "rxjs";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-background',
  template: ``,
  host: {
    'class': 'fixed z-0'
  }
})
export class BackgroundComponent {
  private readonly host = inject(ElementRef);
  private readonly programManager = inject(BackgroundProgramManager);
  private program: { 
    strategy: RenderStrategy; 
    programHandle: RenderProgramHandles | null | undefined; 
    canvas: HTMLCanvasElement; 
    destroy(): void
  } | null = null;

  constructor() {
    this.startBackground();

    // handle resize
    const window = inject(DOCUMENT).defaultView as Window;
    fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {      
      this.program?.programHandle?.resize(window.innerWidth, window.innerHeight)
    });
  }

  private async startBackground() {
    if(this.program) {
      this.program.destroy();
      this.program = null;
    }

    this.program = await this.programManager.createBackgroundProgram();
    if(this.program) {    
      (this.host.nativeElement as HTMLElement).replaceChildren(this.program.canvas);      
    }
  }

  public pause() {
    this.program?.programHandle?.pause();
  }

  public resume() {
    this.program?.programHandle?.resume();
  }
}