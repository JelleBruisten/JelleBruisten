import { ChangeDetectorRef, Component, ElementRef, inject, output } from "@angular/core";
import { BackgroundProgramManager, ProgramRef } from "./manager";
import { RenderStrategy } from "./types";
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
  private programRef: ProgramRef | null = null;
  public renderingStrategyChange = output<RenderStrategy>();

  constructor() {
    // we don't need this component to be attached to the changeDetection scheduler
    inject(ChangeDetectorRef).detach();
    // this.start();

    // handle resize
    const window = inject(DOCUMENT).defaultView as Window;
    fromEvent(window, 'resize').pipe(takeUntilDestroyed()).subscribe(() => {     
      this.programRef?.programHandle?.resize(window.innerWidth, window.innerHeight)
    });
  }

  async start(name?: string, renderStrategy?: RenderStrategy | null) {

    const program = await this.programManager.startProgram(name, renderStrategy);
    if(program) {          
      const canvas = program.canvas;
      (this.host.nativeElement as HTMLElement).replaceChildren(canvas);  

      this.programRef = program;
      this.renderingStrategyChange.emit(program.strategy);
    }
  }

  public pause() {
    this.programRef?.programHandle?.pause();
  }

  public resume() {
    this.programRef?.programHandle?.resume();
  }

  public stop() {
    this.programRef?.programHandle?.stop();
  }
}